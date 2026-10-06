import { db } from "@/utils/firebase";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { Event } from "@/utils/types/event";
import { convertDriveUrl } from "@/utils/imageUtils";

// ============================================================
// TYPES & CONSTANTS
// ============================================================

const EVENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SINGLE_EVENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const USER_REG_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const ADMIN_STATS_CACHE_TTL = 60 * 1000; // 1 minute

export interface UserEventRegistrationStatus {
  isRegistered: boolean;
  registrationId?: string;
  data?: any;
}

export interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalRegistrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  freeRegistrations: number;
}

// ============================================================
// IN-MEMORY CACHE STORES
// ============================================================

let allEventsCache: { events: Event[]; timestamp: number } | null = null;
let allEventsPromise: Promise<Event[]> | null = null;

const singleEventCache = new Map<string, { event: Event; timestamp: number }>();
const singleEventPromises = new Map<string, Promise<Event | null>>();

let featuredEventsCache: { events: Event[]; timestamp: number } | null = null;
let featuredEventsPromise: Promise<Event[]> | null = null;

const userRegCache = new Map<string, { result: UserEventRegistrationStatus; timestamp: number }>();
const userRegPromises = new Map<string, Promise<UserEventRegistrationStatus>>();

const userAbheriCache = new Map<string, { isRegistered: boolean; data?: any; timestamp: number }>();
const userAbheriPromises = new Map<string, Promise<{ isRegistered: boolean; data?: any }>>();

let adminStatsCache: { stats: AdminStats; timestamp: number } | null = null;
let adminStatsPromise: Promise<AdminStats> | null = null;

// ============================================================
// HELPER TO NORMALIZE EVENT
// ============================================================

export function normalizeEventDoc(docId: string, data: any): Event {
  const rawImageUrl =
    typeof data.imageUrl === "string" && data.imageUrl.trim() !== ""
      ? data.imageUrl
      : typeof data.image === "string" && data.image.trim() !== ""
      ? data.image
      : "";

  const rawBgImageUrl =
    typeof data.bgImageUrl === "string" && data.bgImageUrl.trim() !== ""
      ? data.bgImageUrl
      : typeof data.bgImage === "string" && data.bgImage.trim() !== ""
      ? data.bgImage
      : "";

  return {
    id: docId,
    ...data,
    imageUrl: convertDriveUrl(rawImageUrl),
    bgImageUrl: rawBgImageUrl ? convertDriveUrl(rawBgImageUrl) : "",
  } as Event;
}

// ============================================================
// EVENTS CACHE FUNCTIONS
// ============================================================

/**
 * Fetch all events with in-memory caching and request deduplication.
 * Replaces getDocsFromServer with getDocs and shared memory cache.
 */
export async function getAllEvents(forceRefresh = false): Promise<Event[]> {
  const now = Date.now();

  if (!forceRefresh && allEventsCache && now - allEventsCache.timestamp < EVENTS_CACHE_TTL) {
    return allEventsCache.events;
  }

  if (allEventsPromise) {
    return allEventsPromise;
  }

  allEventsPromise = (async () => {
    try {
      const snapshot = await getDocs(collection(db, "events"));
      const events = snapshot.docs.map((docSnap) =>
        normalizeEventDoc(docSnap.id, docSnap.data())
      );

      allEventsCache = { events, timestamp: Date.now() };

      // Also prime individual event cache
      events.forEach((ev) => {
        singleEventCache.set(ev.id, { event: ev, timestamp: Date.now() });
      });

      return events;
    } finally {
      allEventsPromise = null;
    }
  })();

  return allEventsPromise;
}

/**
 * Fetch a single event by ID.
 * Reuses allEventsCache or individual event cache before hitting Firestore.
 */
export async function getEventById(eventId: string, forceRefresh = false): Promise<Event | null> {
  const now = Date.now();

  // 1. Check allEventsCache if already populated
  if (allEventsCache && now - allEventsCache.timestamp < EVENTS_CACHE_TTL) {
    const found = allEventsCache.events.find((e) => e.id === eventId);
    if (found) return found;
  }

  // 2. Check individual event cache
  const cached = singleEventCache.get(eventId);
  if (!forceRefresh && cached && now - cached.timestamp < SINGLE_EVENT_CACHE_TTL) {
    return cached.event;
  }

  // 3. Deduplicate in-flight single event query
  const existingPromise = singleEventPromises.get(eventId);
  if (existingPromise) {
    return existingPromise;
  }

  const p = (async () => {
    try {
      const snap = await getDoc(doc(db, "events", eventId));
      if (!snap.exists()) {
        return null;
      }
      const event = normalizeEventDoc(snap.id, snap.data());
      singleEventCache.set(eventId, { event, timestamp: Date.now() });
      return event;
    } finally {
      singleEventPromises.delete(eventId);
    }
  })();

  singleEventPromises.set(eventId, p);
  return p;
}

/**
 * Fetch featured events for homepage.
 * Reuses allEventsCache if available, otherwise executes an optimized set of queries and caches result.
 */
export async function getFeaturedEvents(forceRefresh = false): Promise<Event[]> {
  const now = Date.now();

  // If all events are already cached, derive directly without any Firestore reads!
  if (allEventsCache && now - allEventsCache.timestamp < EVENTS_CACHE_TTL) {
    const list = allEventsCache.events;
    const rcCar = list.find((e) => e.id === "rc-car-racing");
    const featured = list.filter(
      (e) => (e.featured === true || e.isFeatured === true) && e.id !== "rc-car-racing"
    );
    const result: Event[] = [];
    if (rcCar) result.push(rcCar);
    result.push(...featured.slice(0, 5));
    if (result.length < 5) {
      const recent = list.filter((e) => !result.some((r) => r.id === e.id)).slice(0, 7 - result.length);
      result.push(...recent);
    }
    return result;
  }

  if (!forceRefresh && featuredEventsCache && now - featuredEventsCache.timestamp < EVENTS_CACHE_TTL) {
    return featuredEventsCache.events;
  }

  if (featuredEventsPromise) {
    return featuredEventsPromise;
  }

  featuredEventsPromise = (async () => {
    try {
      const fetchedEvents: Event[] = [];

      // 1. Fetch featured events (up to 6)
      const featuredQuery = query(
        collection(db, "events"),
        where("featured", "==", true),
        limit(6)
      );
      const featuredSnapshot = await getDocs(featuredQuery);
      featuredSnapshot.docs.forEach((docSnap) => {
        fetchedEvents.push(normalizeEventDoc(docSnap.id, docSnap.data()));
      });

      // 2. Check if rc-car-racing is already among them; if not, fetch via direct doc getDoc
      const hasRcCar = fetchedEvents.some((e) => e.id === "rc-car-racing");
      if (!hasRcCar) {
        try {
          const rcSnap = await getDoc(doc(db, "events", "rc-car-racing"));
          if (rcSnap.exists()) {
            fetchedEvents.unshift(normalizeEventDoc(rcSnap.id, rcSnap.data()));
          }
        } catch {
          // Ignore if rc-car-racing does not exist
        }
      } else {
        // Move rc-car-racing to front
        const idx = fetchedEvents.findIndex((e) => e.id === "rc-car-racing");
        if (idx > 0) {
          const [rcCar] = fetchedEvents.splice(idx, 1);
          fetchedEvents.unshift(rcCar);
        }
      }

      // 3. Fallback if fewer than 5 events
      if (fetchedEvents.length < 5) {
        const recentQuery = query(collection(db, "events"), limit(7));
        const recentSnapshot = await getDocs(recentQuery);
        recentSnapshot.docs.forEach((docSnap) => {
          if (!fetchedEvents.some((e) => e.id === docSnap.id) && fetchedEvents.length < 7) {
            fetchedEvents.push(normalizeEventDoc(docSnap.id, docSnap.data()));
          }
        });
      }

      featuredEventsCache = { events: fetchedEvents, timestamp: Date.now() };
      return fetchedEvents;
    } finally {
      featuredEventsPromise = null;
    }
  })();

  return featuredEventsPromise;
}

/**
 * Invalidate all event caches (call after admin creates/updates/deletes an event)
 */
export function invalidateEventsCache() {
  allEventsCache = null;
  allEventsPromise = null;
  singleEventCache.clear();
  singleEventPromises.clear();
  featuredEventsCache = null;
  featuredEventsPromise = null;
}

// ============================================================
// USER REGISTRATION STATUS CACHE
// ============================================================

/**
 * Check if a user is registered for an event with in-memory caching and deduplication.
 */
export async function checkUserEventRegistration(
  eventId: string,
  userId: string,
  forceRefresh = false
): Promise<UserEventRegistrationStatus> {
  const key = `${userId}_${eventId}`;
  const now = Date.now();

  const cached = userRegCache.get(key);
  if (!forceRefresh && cached && now - cached.timestamp < USER_REG_CACHE_TTL) {
    return cached.result;
  }

  const existingPromise = userRegPromises.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const p = (async () => {
    try {
      const q = query(
        collection(db, "registrations"),
        where("eventId", "==", eventId),
        where("userId", "==", userId),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        const res: UserEventRegistrationStatus = { isRegistered: false };
        userRegCache.set(key, { result: res, timestamp: Date.now() });
        return res;
      }

      const regDoc = snapshot.docs[0];
      const data = regDoc.data();
      const status = data.status;
      const isRegistered =
        status === "paid" ||
        status === "registered" ||
        String(data.paymentStatus || "").toLowerCase().trim() === "paid";

      const res: UserEventRegistrationStatus = {
        isRegistered,
        registrationId: regDoc.id,
        data,
      };

      userRegCache.set(key, { result: res, timestamp: Date.now() });
      return res;
    } finally {
      userRegPromises.delete(key);
    }
  })();

  userRegPromises.set(key, p);
  return p;
}

/**
 * Directly update user registration status in cache (e.g. after successful registration)
 */
export function setUserEventRegistration(
  eventId: string,
  userId: string,
  result: UserEventRegistrationStatus
) {
  const key = `${userId}_${eventId}`;
  userRegCache.set(key, { result, timestamp: Date.now() });
}

export function invalidateUserRegistrationCache(eventId?: string, userId?: string) {
  if (eventId && userId) {
    userRegCache.delete(`${userId}_${eventId}`);
  } else {
    userRegCache.clear();
  }
}

// ============================================================
// ABHERI REGISTRATION CACHE
// ============================================================

export async function checkUserAbheriRegistration(
  userId: string,
  forceRefresh = false
): Promise<{ isRegistered: boolean; data?: any; registrationId?: string }> {
  const now = Date.now();
  const cached = userAbheriCache.get(userId);

  if (!forceRefresh && cached && now - cached.timestamp < USER_REG_CACHE_TTL) {
    return cached;
  }

  const existingPromise = userAbheriPromises.get(userId);
  if (existingPromise) {
    return existingPromise;
  }

  const p = (async () => {
    try {
      const q = query(
        collection(db, "abheri_registrations"),
        where("userId", "==", userId),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        const res = { isRegistered: false };
        userAbheriCache.set(userId, { ...res, timestamp: Date.now() });
        return res;
      }

      const regDoc = snapshot.docs[0];
      const res = {
        isRegistered: true,
        registrationId: regDoc.id,
        data: regDoc.data(),
      };
      userAbheriCache.set(userId, { ...res, timestamp: Date.now() });
      return res;
    } finally {
      userAbheriPromises.delete(userId);
    }
  })();

  userAbheriPromises.set(userId, p);
  return p;
}

export function setUserAbheriRegistration(
  userId: string,
  isRegistered: boolean,
  data?: any,
  registrationId?: string
) {
  userAbheriCache.set(userId, {
    isRegistered,
    data,
    timestamp: Date.now(),
  });
}

// ============================================================
// ADMIN DASHBOARD AGGREGATION STATS CACHE
// ============================================================

/**
 * Fetch admin summary statistics using Firestore getCountFromServer aggregation queries.
 * Reduces thousands of full document downloads to 5-7 aggregation reads.
 */
export async function getAdminDashboardStats(forceRefresh = false): Promise<AdminStats> {
  const now = Date.now();

  if (!forceRefresh && adminStatsCache && now - adminStatsCache.timestamp < ADMIN_STATS_CACHE_TTL) {
    return adminStatsCache.stats;
  }

  if (adminStatsPromise) {
    return adminStatsPromise;
  }

  adminStatsPromise = (async () => {
    try {
      const [
        usersCountSnap,
        eventsCountSnap,
        totalRegsCountSnap,
        paidRegsCountSnap,
        pendingRegsCountSnap,
        freeRegsCountSnap,
        registeredRegsCountSnap,
      ] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "events")),
        getCountFromServer(collection(db, "registrations")),
        getCountFromServer(
          query(collection(db, "registrations"), where("status", "==", "paid"))
        ),
        getCountFromServer(
          query(collection(db, "registrations"), where("status", "==", "pending"))
        ),
        getCountFromServer(
          query(collection(db, "registrations"), where("status", "==", "free"))
        ),
        getCountFromServer(
          query(collection(db, "registrations"), where("status", "==", "registered"))
        ),
      ]);

      const stats: AdminStats = {
        totalUsers: usersCountSnap.data().count,
        totalEvents: eventsCountSnap.data().count,
        totalRegistrations: totalRegsCountSnap.data().count,
        paidRegistrations: paidRegsCountSnap.data().count,
        pendingRegistrations: pendingRegsCountSnap.data().count,
        freeRegistrations:
          freeRegsCountSnap.data().count + registeredRegsCountSnap.data().count,
      };

      adminStatsCache = { stats, timestamp: Date.now() };
      return stats;
    } finally {
      adminStatsPromise = null;
    }
  })();

  return adminStatsPromise;
}

export function invalidateAdminStatsCache() {
  adminStatsCache = null;
  adminStatsPromise = null;
}

// ============================================================
// ADMIN COLLECTIONS MULTI-TIER CACHE
// (Users, Registrations, Visitors, Alumni, Abheri)
// ============================================================

const ADMIN_COLLECTIONS_TTL = 3 * 60 * 1000; // 3 minutes TTL

// Helper to safely load from sessionStorage (client-side only)
function getSessionCache<T>(key: string): { data: T; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.timestamp === "number" &&
      Date.now() - parsed.timestamp < ADMIN_COLLECTIONS_TTL &&
      Array.isArray(parsed.data)
    ) {
      return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

// Helper to safely save to sessionStorage
function setSessionCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore quota errors
  }
}

// Helper to remove from sessionStorage
function clearSessionCache(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

// ── 1. Admin Users Cache ─────────────────────────────────────
let adminUsersCache: { data: any[]; timestamp: number } | null = null;
let adminUsersPromise: Promise<any[]> | null = null;

export async function getAdminUsers(forceRefresh = false): Promise<any[]> {
  const now = Date.now();

  if (!forceRefresh && adminUsersCache && now - adminUsersCache.timestamp < ADMIN_COLLECTIONS_TTL) {
    return adminUsersCache.data;
  }

  if (!forceRefresh) {
    const sessionItem = getSessionCache<any[]>("sparkz_admin_users");
    if (sessionItem) {
      adminUsersCache = sessionItem;
      return sessionItem.data;
    }
  }

  if (adminUsersPromise) {
    return adminUsersPromise;
  }

  adminUsersPromise = (async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      adminUsersCache = { data: list, timestamp: Date.now() };
      setSessionCache("sparkz_admin_users", list);
      return list;
    } finally {
      adminUsersPromise = null;
    }
  })();

  return adminUsersPromise;
}

export function invalidateAdminUsersCache() {
  adminUsersCache = null;
  adminUsersPromise = null;
  clearSessionCache("sparkz_admin_users");
}

export function updateCachedAdminUser(userId: string, partialData: Record<string, any>) {
  if (adminUsersCache) {
    adminUsersCache.data = adminUsersCache.data.map((u) =>
      u.id === userId ? { ...u, ...partialData } : u
    );
    setSessionCache("sparkz_admin_users", adminUsersCache.data);
  }
}

export function addCachedAdminUser(newUser: Record<string, any>) {
  if (adminUsersCache) {
    adminUsersCache.data = [newUser, ...adminUsersCache.data];
    setSessionCache("sparkz_admin_users", adminUsersCache.data);
  }
}

// ── 2. Admin Registrations Cache ─────────────────────────────
let adminRegsCache: { data: any[]; timestamp: number } | null = null;
let adminRegsPromise: Promise<any[]> | null = null;

export async function getAdminRegistrations(forceRefresh = false): Promise<any[]> {
  const now = Date.now();

  if (!forceRefresh && adminRegsCache && now - adminRegsCache.timestamp < ADMIN_COLLECTIONS_TTL) {
    return adminRegsCache.data;
  }

  if (!forceRefresh) {
    const sessionItem = getSessionCache<any[]>("sparkz_admin_registrations");
    if (sessionItem) {
      adminRegsCache = sessionItem;
      return sessionItem.data;
    }
  }

  if (adminRegsPromise) {
    return adminRegsPromise;
  }

  adminRegsPromise = (async () => {
    try {
      const snapshot = await getDocs(collection(db, "registrations"));
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      adminRegsCache = { data: list, timestamp: Date.now() };
      setSessionCache("sparkz_admin_registrations", list);
      return list;
    } finally {
      adminRegsPromise = null;
    }
  })();

  return adminRegsPromise;
}

export function invalidateAdminRegistrationsCache() {
  adminRegsCache = null;
  adminRegsPromise = null;
  clearSessionCache("sparkz_admin_registrations");
}

export function updateCachedAdminRegistration(regId: string, partialData: Record<string, any>) {
  if (adminRegsCache) {
    adminRegsCache.data = adminRegsCache.data.map((r) =>
      r.id === regId ? { ...r, ...partialData } : r
    );
    setSessionCache("sparkz_admin_registrations", adminRegsCache.data);
  }
}

export function removeCachedAdminRegistration(regId: string) {
  if (adminRegsCache) {
    adminRegsCache.data = adminRegsCache.data.filter((r) => r.id !== regId);
    setSessionCache("sparkz_admin_registrations", adminRegsCache.data);
  }
}

export function addCachedAdminRegistration(newReg: Record<string, any>) {
  if (adminRegsCache) {
    adminRegsCache.data = [newReg, ...adminRegsCache.data];
    setSessionCache("sparkz_admin_registrations", adminRegsCache.data);
  }
}

// ── 3. Admin Visitor Registrations Cache ─────────────────────
let adminVisitorCache: { data: any[]; timestamp: number } | null = null;
let adminVisitorPromise: Promise<any[]> | null = null;

export async function getAdminVisitorRegistrations(forceRefresh = false): Promise<any[]> {
  const now = Date.now();

  if (!forceRefresh && adminVisitorCache && now - adminVisitorCache.timestamp < ADMIN_COLLECTIONS_TTL) {
    return adminVisitorCache.data;
  }

  if (!forceRefresh) {
    const sessionItem = getSessionCache<any[]>("sparkz_admin_visitors");
    if (sessionItem) {
      adminVisitorCache = sessionItem;
      return sessionItem.data;
    }
  }

  if (adminVisitorPromise) {
    return adminVisitorPromise;
  }

  adminVisitorPromise = (async () => {
    try {
      const q = query(collection(db, "visitor_registrations"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      adminVisitorCache = { data: list, timestamp: Date.now() };
      setSessionCache("sparkz_admin_visitors", list);
      return list;
    } finally {
      adminVisitorPromise = null;
    }
  })();

  return adminVisitorPromise;
}

export function invalidateAdminVisitorCache() {
  adminVisitorCache = null;
  adminVisitorPromise = null;
  clearSessionCache("sparkz_admin_visitors");
}

export function updateCachedAdminVisitor(visitorId: string, partialData: Record<string, any>) {
  if (adminVisitorCache) {
    adminVisitorCache.data = adminVisitorCache.data.map((v) =>
      v.id === visitorId ? { ...v, ...partialData } : v
    );
    setSessionCache("sparkz_admin_visitors", adminVisitorCache.data);
  }
}

export function removeCachedAdminVisitor(visitorId: string) {
  if (adminVisitorCache) {
    adminVisitorCache.data = adminVisitorCache.data.filter((v) => v.id !== visitorId);
    setSessionCache("sparkz_admin_visitors", adminVisitorCache.data);
  }
}

export function addCachedAdminVisitor(newVisitor: Record<string, any>) {
  if (adminVisitorCache) {
    adminVisitorCache.data = [newVisitor, ...adminVisitorCache.data];
    setSessionCache("sparkz_admin_visitors", adminVisitorCache.data);
  }
}

// ── 4. Admin Alumni Registrations Cache ──────────────────────
let adminAlumniCache: { data: any[]; timestamp: number } | null = null;
let adminAlumniPromise: Promise<any[]> | null = null;

export async function getAdminAlumniRegistrations(forceRefresh = false): Promise<any[]> {
  const now = Date.now();

  if (!forceRefresh && adminAlumniCache && now - adminAlumniCache.timestamp < ADMIN_COLLECTIONS_TTL) {
    return adminAlumniCache.data;
  }

  if (!forceRefresh) {
    const sessionItem = getSessionCache<any[]>("sparkz_admin_alumni");
    if (sessionItem) {
      adminAlumniCache = sessionItem;
      return sessionItem.data;
    }
  }

  if (adminAlumniPromise) {
    return adminAlumniPromise;
  }

  adminAlumniPromise = (async () => {
    try {
      const q = query(collection(db, "alumni_registrations"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      adminAlumniCache = { data: list, timestamp: Date.now() };
      setSessionCache("sparkz_admin_alumni", list);
      return list;
    } finally {
      adminAlumniPromise = null;
    }
  })();

  return adminAlumniPromise;
}

export function invalidateAdminAlumniCache() {
  adminAlumniCache = null;
  adminAlumniPromise = null;
  clearSessionCache("sparkz_admin_alumni");
}

export function updateCachedAdminAlumni(alumniId: string, partialData: Record<string, any>) {
  if (adminAlumniCache) {
    adminAlumniCache.data = adminAlumniCache.data.map((a) =>
      a.id === alumniId ? { ...a, ...partialData } : a
    );
    setSessionCache("sparkz_admin_alumni", adminAlumniCache.data);
  }
}

export function removeCachedAdminAlumni(alumniId: string) {
  if (adminAlumniCache) {
    adminAlumniCache.data = adminAlumniCache.data.filter((a) => a.id !== alumniId);
    setSessionCache("sparkz_admin_alumni", adminAlumniCache.data);
  }
}

// ── 5. Admin Abheri Registrations Cache ──────────────────────
let adminAbheriCache: { data: any[]; timestamp: number } | null = null;
let adminAbheriPromise: Promise<any[]> | null = null;

export async function getAdminAbheriRegistrations(forceRefresh = false): Promise<any[]> {
  const now = Date.now();

  if (!forceRefresh && adminAbheriCache && now - adminAbheriCache.timestamp < ADMIN_COLLECTIONS_TTL) {
    return adminAbheriCache.data;
  }

  if (!forceRefresh) {
    const sessionItem = getSessionCache<any[]>("sparkz_admin_abheri");
    if (sessionItem) {
      adminAbheriCache = sessionItem;
      return sessionItem.data;
    }
  }

  if (adminAbheriPromise) {
    return adminAbheriPromise;
  }

  adminAbheriPromise = (async () => {
    try {
      const q = query(collection(db, "abheri_registrations"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      adminAbheriCache = { data: list, timestamp: Date.now() };
      setSessionCache("sparkz_admin_abheri", list);
      return list;
    } finally {
      adminAbheriPromise = null;
    }
  })();

  return adminAbheriPromise;
}

export function invalidateAdminAbheriCache() {
  adminAbheriCache = null;
  adminAbheriPromise = null;
  clearSessionCache("sparkz_admin_abheri");
}

export function updateCachedAdminAbheri(regId: string, partialData: Record<string, any>) {
  if (adminAbheriCache) {
    adminAbheriCache.data = adminAbheriCache.data.map((a) =>
      a.id === regId ? { ...a, ...partialData } : a
    );
    setSessionCache("sparkz_admin_abheri", adminAbheriCache.data);
  }
}


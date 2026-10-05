import React from 'react'
import Header from '@/widgets/common/Header'
import Footer from '@/widgets/common/Footer'
import MaintenanceGate from '@/components/common/MaintenanceGate'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MaintenanceGate>
      <div>
        <Header />
        {children}
        <Footer />
      </div>
    </MaintenanceGate>
  )
}

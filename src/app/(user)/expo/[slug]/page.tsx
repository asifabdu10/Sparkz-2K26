import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ExpoRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/exhibitions/${slug}`);
}

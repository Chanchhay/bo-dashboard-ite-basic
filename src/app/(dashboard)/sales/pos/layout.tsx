import { Navbar } from "@/components/pos/navbar-pos/navbar"

export default function PosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <section>
    <Navbar/>
    {children}
    </section>
}
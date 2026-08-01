import { Navbar } from "@/components/pos/navbar-pos/navbar";
import { PosScreen } from "@/components/pos/pos-screen";

export default function PosPage(){
  return (
    <section className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0">
        <Navbar />
      </div>
      <main className="min-h-0 flex-1 overflow-hidden">
        <PosScreen />
      </main>
    </section>
  );
}

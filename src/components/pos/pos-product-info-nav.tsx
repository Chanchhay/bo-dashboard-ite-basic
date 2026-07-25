export default function PosProductInfoNav() {
  return (
    <header className=" sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-2 py-4 sm:px-6 bg-white">
        <div className="text-muted-foreground flex flex-1 items-center gap-8 font-medium md:justify-center text-gray-600  lg:gap-16">
          <p className=" max-md:hidden">Product</p>
          <p className=" max-md:hidden">Qty</p>
          <p className=" max-md:hidden">Price</p>
          <p className=" max-md:hidden">Discount</p>
          <p className=" max-md:hidden">Action</p>
        </div>
      </div>
    </header>
  );
}

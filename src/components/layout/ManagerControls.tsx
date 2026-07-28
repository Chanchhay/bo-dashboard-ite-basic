import Image from "next/image";
import Link from "next/link";

const asset = (name: string) => `/post-login-assets/${name}`;

export default function ManagerControls({
    managerName,
}: {
    managerName: string;
}) {
    return (
        <div className="flex items-center gap-6">
            <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-[26px] w-4 items-start pt-2 outline-none focus-visible:ring-2 focus-visible:ring-[#006b26] focus-visible:ring-offset-4"
            >
                <Image
                    src={asset("notification.svg")}
                    alt=""
                    width={16}
                    height={20}
                    className="h-5 w-4"
                />
                <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#006b26]" />
            </button>

            <Link
                href="/profile"
                aria-label={`Open ${managerName}'s profile`}
                className="flex h-[42px] w-[164px] items-center gap-3 rounded-full border border-[#bccab8] py-[5px] pr-[17px] pl-[5px] text-left outline-none transition-colors hover:bg-[#f5f8f4] focus-visible:ring-2 focus-visible:ring-[#006b26] focus-visible:ring-offset-2"
            >
                <span className="relative size-8 shrink-0 overflow-hidden rounded-full border border-[#006b26]">
                    <Image
                        src={asset("manager-avatar.png")}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                    />
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-end">
                    <span className="max-w-full truncate text-[11px] leading-4 font-semibold tracking-[0.55px]">
                        {managerName}
                    </span>
                    <span className="text-[10px] leading-[15px] text-[#3d4a3c] uppercase">
                        General Manager
                    </span>
                </span>
            </Link>
        </div>
    );
}

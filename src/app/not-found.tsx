import Link from "next/link"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"


export default function NotFound() {
  return (

     <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2">
   
        <div className="text-center md:text-left">
          <p className="text-4xl font-extrabold text-foreground">404</p>

          <h1 className="mt-2 text-4xl font-extrabold text-foreground sm:text-5xl">
            Page Not Found
          </h1>

          <p className="mx-auto mt-5 max-w-sm text-base text-muted-foreground md:mx-0">
            Sorry, the page you are looking for does not exist. Please go to
            the homepage to continue.
          </p>

          <Button
          
            size="lg"
            className="mt-8 rounded-full bg-primary px-7 text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <Home className="h-4 w-4 shrink-0" />
              <span>Go Home</span>
            </Link>
          </Button>
        </div>

       
        <div className="relative flex items-center justify-center">
          <svg
            viewBox="0 0 480 320"
            className="w-full max-w-2xl text-primary"
            fill="none"
          >
          
            <g className="text-primary/40" fill="currentColor">
              <circle cx="20" cy="40" r="3" />
              <circle cx="40" cy="60" r="3" />
              <circle cx="20" cy="80" r="3" />
              <circle cx="40" cy="100" r="3" />
              <circle cx="20" cy="120" r="3" />
              <circle cx="60" cy="30" r="3" />
              <circle cx="440" cy="230" r="3" />
              <circle cx="460" cy="250" r="3" />
              <circle cx="440" cy="270" r="3" />
              <circle cx="460" cy="290" r="3" />
              <circle cx="420" cy="290" r="3" />
            </g>

            <g className="text-primary/30" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
              <line x1="90" y1="20" x2="90" y2="45" />
              <line x1="105" y1="10" x2="105" y2="45" />
              <line x1="120" y1="25" x2="120" y2="45" />
            </g>

            <g
              className="text-primary/40"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M340 260 h30 v20" />
              <path d="M380 270 h20" />
              <circle cx="402" cy="270" r="3" fill="currentColor" stroke="none" />
              <path d="M355 285 v15 h25" />
              <circle cx="382" cy="300" r="3" fill="currentColor" stroke="none" />
            </g>

          
            <text
              x="240"
              y="230"
              textAnchor="middle"
              fontSize="150"
              fontWeight="800"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              fontFamily="Arial, sans-serif"
              className="text-primary"
            >
              404
            </text>

           
            <g transform="translate(178, 40)">
              <line x1="45" y1="0" x2="45" y2="14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="45" cy="0" r="4" fill="currentColor" />

              <rect
                x="10"
                y="14"
                width="70"
                height="55"
                rx="14"
                fill="white"
                stroke="currentColor"
                strokeWidth="3"
              />

              <circle cx="32" cy="42" r="6" fill="currentColor" />
              <circle cx="58" cy="42" r="6" fill="currentColor" />

              <path
                d="M32 58 Q45 50 58 58"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />

              <text
                x="92"
                y="20"
                fontSize="28"
                fontWeight="700"
                fill="currentColor"
                fontFamily="Arial, sans-serif"
              >
                ?
              </text>

              <rect
                x="0"
                y="75"
                width="90"
                height="60"
                rx="12"
                fill="white"
                stroke="currentColor"
                strokeWidth="3"
              />
              <rect
                x="20"
                y="90"
                width="50"
                height="30"
                rx="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />

              <line x1="0" y1="90" x2="-18" y2="70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="-18" cy="70" r="5" fill="currentColor" />
              <line x1="90" y1="90" x2="108" y2="105" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="108" cy="105" r="5" fill="currentColor" />

              <line x1="25" y1="135" x2="25" y2="155" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <line x1="65" y1="135" x2="65" y2="155" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </div>
    </div>
    
    
  )
}
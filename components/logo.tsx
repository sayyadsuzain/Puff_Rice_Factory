import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })

export function Logo() {
  return (
    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
      <span className={`${playfair.className} text-white font-bold text-lg`}>MS</span>
    </div>
  )
}

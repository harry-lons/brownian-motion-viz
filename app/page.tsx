"use client"

import BrownianMotionSimulator from "../brownian-motion-simulator"

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <BrownianMotionSimulator />
    </main>
  )
}

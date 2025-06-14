"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, RotateCcw } from "lucide-react"
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface BrownianPoint {
  time: number
  value: number
}

export default function BrownianMotionSimulator() {
  // Parameters
  const [drift, setDrift] = useState(0)
  const [diffusion, setDiffusion] = useState(1)
  const [steps, setSteps] = useState(1000)
  const [intervalLength, setIntervalLength] = useState(10)

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [path, setPath] = useState<BrownianPoint[]>([])
  const [fullPath, setFullPath] = useState<BrownianPoint[]>([])

  const animationRef = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate Brownian motion path
  const generatePath = useCallback(() => {
    const dt = intervalLength / steps
    const newPath: BrownianPoint[] = [{ time: 0, value: 0 }]

    let currentValue = 0

    for (let i = 1; i <= steps; i++) {
      // Brownian motion: dX = μ*dt + σ*sqrt(dt)*Z
      // where Z is standard normal random variable
      const randomNormal = generateNormalRandom()
      const dX = drift * dt + diffusion * Math.sqrt(dt) * randomNormal
      currentValue += dX

      newPath.push({
        time: i * dt,
        value: currentValue,
      })
    }

    return newPath
  }, [drift, diffusion, steps, intervalLength])

  // Box-Muller transform for normal random numbers
  const generateNormalRandom = () => {
    const u1 = Math.random()
    const u2 = Math.random()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }

  // Reset simulation
  const resetSimulation = () => {
    setIsAnimating(false)
    setCurrentStep(0)
    setPath([])

    // clear the canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    const newFullPath = generatePath()
    setFullPath(newFullPath)
  }

  // Start/pause animation
  const toggleAnimation = () => {
    if (isAnimating) {
      setIsAnimating(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else {
      setIsAnimating(true)
    }
  }

  // Animation loop
  useEffect(() => {
    if (isAnimating && currentStep < fullPath.length - 1) {
      const animate = () => {
        setCurrentStep((prev) => {
          const next = prev + 1
          setPath(fullPath.slice(0, next + 1))
          return next
        })

        if (currentStep < fullPath.length - 2) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAnimating, currentStep, fullPath])

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || path.length < 2) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate bounds
    const allValues = fullPath.map((p) => p.value)
    const minValue = Math.min(...allValues, 0)
    const maxValue = Math.max(...allValues, 0)
    const maxAbsValue = Math.max(Math.abs(minValue), Math.abs(maxValue))
    // Ensure we have a reasonable range, minimum of 1 unit
    const range = Math.max(maxAbsValue * 1.2, 0.5)
    const yMin = -range
    const yMax = range

    const padding = 40
    const width = canvas.width - 2 * padding
    const height = canvas.height - 2 * padding

    // Draw axes
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    ctx.beginPath()
    // X-axis
    ctx.moveTo(padding, height / 2 + padding)
    ctx.lineTo(width + padding, height / 2 + padding)
    // Y-axis
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height + padding)
    ctx.stroke()

    // Draw grid
    ctx.strokeStyle = "#f3f4f6"
    ctx.lineWidth = 0.5
    for (let i = 1; i < 10; i++) {
      const x = padding + (i * width) / 10
      const y = padding + (i * height) / 10

      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height + padding)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width + padding, y)
      ctx.stroke()
    }

    // Highlight y=0 axis
    ctx.strokeStyle = "#ef4444"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const zeroY = padding + height / 2
    ctx.moveTo(padding, zeroY)
    ctx.lineTo(width + padding, zeroY)
    ctx.stroke()

    // Draw path
    if (path.length > 1) {
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 2
      ctx.beginPath()

      for (let i = 0; i < path.length; i++) {
        const point = path[i]
        const x = padding + (point.time / intervalLength) * width
        const y = padding + height / 2 - (point.value / range) * (height / 2)

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // Draw current point
      if (path.length > 0) {
        const currentPoint = path[path.length - 1]
        const x = padding + (currentPoint.time / intervalLength) * width
        const y = padding + height / 2 - (currentPoint.value / range) * (height / 2)

        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    // Draw labels
    ctx.fillStyle = "#374151"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"

    // X-axis labels
    for (let i = 0; i <= 5; i++) {
      const x = padding + (i * width) / 5
      const value = (i * intervalLength) / 5
      ctx.fillText(value.toFixed(1), x, height + padding + 20)
    }

    // Y-axis labels - center around 0
    ctx.textAlign = "right"
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i * height) / 10
      const value = yMax - (i * (yMax - yMin)) / 10
      if (Math.abs(value) < 0.001) {
        // Highlight y=0 line
        ctx.fillStyle = "#ef4444"
        ctx.font = "bold 12px sans-serif"
        ctx.fillText("0", padding - 10, y + 4)
        ctx.fillStyle = "#374151"
        ctx.font = "12px sans-serif"
      } else {
        ctx.fillText(value.toFixed(2), padding - 10, y + 4)
      }
    }
  }, [path, fullPath, intervalLength])

  // Initialize
  useEffect(() => {
    resetSimulation()
  }, [generatePath])

  const currentValue = path.length > 0 ? path[path.length - 1].value : 0
  const currentTime = path.length > 0 ? path[path.length - 1].time : 0

  return (
    <div className="w-full max-w-6xl mx-auto px-6 pt-2 pb-6 space-y-6">
      <div className="text-center space-y-2 mb-4">
        <h1 className="text-4xl font-bold text-gray-900">Brownian Motion Simulator</h1>
        <p className="text-lg text-gray-600">by Harry Lonsdale</p>
      </div>
      <Card>
        <CardContent className="pt-4 space-y-6">
          {/* Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drift">Drift (μ)</Label>
              <Input
                id="drift"
                type="number"
                step="0.01"
                value={drift}
                onChange={(e) => setDrift(Number.parseFloat(e.target.value) || 0)}
                disabled={isAnimating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diffusion">Diffusion (σ)</Label>
              <Input
                id="diffusion"
                type="number"
                step="0.01"
                value={diffusion}
                onChange={(e) => setDiffusion(Number.parseFloat(e.target.value) || 0)}
                disabled={isAnimating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="steps">Steps (n)</Label>
              <Input
                id="steps"
                type="number"
                min="100"
                max="5000"
                value={steps}
                onChange={(e) => setSteps(Number.parseInt(e.target.value) || 1000)}
                disabled={isAnimating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Interval (k)</Label>
              <Input
                id="interval"
                type="number"
                step="0.1"
                value={intervalLength}
                onChange={(e) => setIntervalLength(Number.parseFloat(e.target.value) || 1)}
                disabled={isAnimating}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button onClick={toggleAnimation} variant="default">
              {isAnimating ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isAnimating ? "Pause" : "Start"}
            </Button>
            <Button onClick={resetSimulation} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Current values */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Current Time</div>
              <div className="text-lg font-mono">{currentTime.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Current Value</div>
              <div className="text-lg font-mono">{currentValue.toFixed(3)}</div>
            </div>
          </div>

          {/* Canvas */}
          <div className="border rounded-lg p-4 bg-white">
            <canvas ref={canvasRef} width={800} height={400} className="w-full h-auto border rounded" />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>
                {currentStep} / {fullPath.length - 1} steps
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${(currentStep / (fullPath.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="text-gray-700 leading-relaxed">
            <h2 className="text-2xl font-semibold mb-2">Understanding Brownian Motion</h2>

            <p className="mb-4">
              Brownian motion—also known in mathematical contexts as the <strong>Wiener process</strong>—describes a continuous-time stochastic process that models random movement. These terms are often used interchangeably, although "Brownian motion" is the more general term used in physics and applied sciences, while "Wiener process" refers specifically to the standard mathematical formulation with mean zero and variance growing linearly in time.
            </p>

            <p className="mb-4">
              A common generalization of Brownian motion includes both a deterministic trend and a random component. This is captured by a stochastic differential equation (SDE) for a one-dimensional process <InlineMath math="X(t)" />:
            </p>

            <div className="bg-gray-50 p-4 rounded-md mb-4 text-center overflow-x-auto">
              <BlockMath math="dX(t) = \mu\,dt + \sigma\,dW(t)" />
            </div>

            <p className="mb-4">
              In this equation, <InlineMath math="dX(t)" /> is the infinitesimal change in the process <InlineMath math="X(t)" /> over a small time interval <InlineMath math="dt" />. The term <InlineMath math="\mu\,dt" /> represents the <strong>drift</strong>—a deterministic component where <InlineMath math="\mu" /> is the drift coefficient indicating the average rate of change. Positive drift (<InlineMath math="\mu &gt; 0" />) implies an upward trend over time, while negative drift implies a downward trend.
            </p>

            <p className="mb-4">
              The term <InlineMath math="\sigma\,dW(t)" /> captures the <strong>diffusion</strong>, where <InlineMath math="dW(t)" /> is an increment of the standard Wiener process. This component introduces randomness, modeling unpredictable fluctuations. The coefficient <InlineMath math="\sigma" /> controls the magnitude of this noise: higher values of <InlineMath math="\sigma" /> lead to more volatile trajectories.
            </p>

            <p className="mb-4">
              The Wiener process <InlineMath math="W(t)" /> is a mathematical idealization of Brownian motion: it starts at zero, has continuous paths, independent increments, and for any time <InlineMath math="t" />, the increment <InlineMath math="W(t + \Delta t) - W(t)" /> is normally distributed with mean 0 and variance <InlineMath math="\Delta t" />. In symbols: <InlineMath math="dW(t) \sim \mathcal{N}(0,\,dt)" />.
            </p>

            <p className="mb-4">
              When <InlineMath math="\mu = 0" /> and <InlineMath math="\sigma = 1" />, the SDE simplifies to <InlineMath math="dX(t) = dW(t)" />, and the process <InlineMath math="X(t)" /> is just the standard Wiener process itself—that is, standard Brownian motion without drift or scaling.
            </p>

            <p className="mb-4">
              This framework is foundational in modeling systems that combine predictable trends with random variation, including applications in physics, biology, and especially finance (e.g., the Black–Scholes model). The parameters <InlineMath math="\mu" /> and <InlineMath math="\sigma" /> together determine the relative strength of deterministic versus stochastic forces.
            </p>

            <p>
              For more background, visit the Wikipedia pages on{" "}
              <a
                href="https://en.wikipedia.org/wiki/Brownian_motion"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Brownian motion
              </a>{" "}
              and{" "}
              <a
                href="https://en.wikipedia.org/wiki/Wiener_process"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Wiener process
              </a>
              .
            </p>
          </div>


          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>
              <strong>μ (drift)</strong>: The average rate of change over time
            </li>
            <li>
              <strong>σ (diffusion)</strong>: The volatility or randomness intensity
            </li>
            <li>
              <strong>n (steps)</strong>: Number of discrete time steps
            </li>
            <li>
              <strong>k (interval)</strong>: Total time length of the simulation
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

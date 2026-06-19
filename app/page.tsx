"use client"
import { useState } from "react"

const Home = () => {
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleHelloMessage = async () => {
    setError("")
    try {
      const response = await fetch("/api/hello", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }
      const data = await response.json()
      setMessage(data.message || "Hello World")
    } catch (err) {
      setError("Unable to fetch message")
      console.error(err)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <p className="text-lg">message: {message || "(click the button)"}</p>
      {error && <p className="text-red-600">{error}</p>}
      <button
        onClick={handleHelloMessage}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Get Hello Message
      </button>
    </main>
  )
}

export default Home
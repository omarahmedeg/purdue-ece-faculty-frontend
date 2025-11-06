import { FacultySearch } from "@/components/faculty-search"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="mb-3 font-serif text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
            Purdue ECE Faculty Directory
          </h1>
          <p className="text-lg text-muted-foreground">Search by faculty name or research area</p>
        </div>
        <FacultySearch />
      </div>
    </main>
  )
}

// Phase 5 — Session Detail
export default function SessionDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Session {params.id}</h1>
      <p className="mt-2 text-gray-500">Implemented in Phase 5</p>
    </main>
  )
}

export default function ClienteDashboard({ clienteId }: { clienteId: string }) {
  return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400 text-sm">Dashboard cliente: {clienteId}</p></div>;
}

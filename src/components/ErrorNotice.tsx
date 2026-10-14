export default function ErrorNotice({ message }: { message: string | null }) {
  return message ? (
    <div role="alert" className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-3">
      {message}
    </div>
  ) : null
}

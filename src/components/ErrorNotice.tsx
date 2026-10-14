export default function ErrorNotice({ message }: { message: string | null }) {
  return message ? (
    <div role="alert" className="border border-danger bg-danger-bg text-danger-text rounded-lg p-3">
      {message}
    </div>
  ) : null
}

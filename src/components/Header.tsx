import ErrorNotice from './ErrorNotice'
import { errorMessage } from '../lib/errors'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Bell, X } from 'lucide-react'
import { Notification } from '../types'

export default function Header() {
  const { user, profile, activeDomain } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) {
        setError(errorMessage(error))
        return
      }
      setNotifications((data || []) as Notification[])
      setUnreadCount((data || []).filter((n) => !n.is_read).length)
    }
    loadNotifications()
  }, [user])

  const markAllRead = async () => {
    if (!user) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
    if (error) {
      setError(errorMessage(error))
      return
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h2 className="text-lg font-semibold text-gray-800">
        Welcome, {profile?.display_name?.split(' ')[0] ?? 'User'}
      </h2>

      <div className="relative">
        <button
          aria-label="Notifications"
          onClick={() => setShowNotif(!showNotif)}
          className="relative p-2 rounded-lg hover:bg-gray-50 transition"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotif && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowNotif(false)} />
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button aria-label="Close notifications" onClick={() => setShowNotif(false)}>
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <ErrorNotice message={error} />
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4 text-center">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b border-gray-50 ${!n.is_read ? 'bg-primary-50/50' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-800">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-1">{n.body}</p>}
                      <p className="text-xs text-gray-300 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

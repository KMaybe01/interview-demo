import { useEffect, useRef, useState } from 'react'

const VERSION_KEY = 'cached-version'
const DISMISSED_KEY = 'dismissed-version'
const CHECK_INTERVAL = 300_000

interface VersionData {
  timestamp: number
}

function fetchVersion(base: string): Promise<VersionData> {
  return fetch(`${base}version.json?t=${Date.now()}`).then((res) => {
    if (!res.ok) throw new Error('fetch failed')
    return res.json() as Promise<VersionData>
  })
}

export default function UpdateNotification() {
  const [visible, setVisible] = useState(false)
  const latestVersion = useRef<string>('')

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    let isFirstCheck = true

    async function checkUpdate() {
      try {
        const data = await fetchVersion(base)
        const newVersion = String(data.timestamp)
        latestVersion.current = newVersion

        if (isFirstCheck) {
          isFirstCheck = false
          localStorage.setItem(VERSION_KEY, newVersion)
          return
        }

        const cachedVersion = localStorage.getItem(VERSION_KEY)
        const dismissedVersion = localStorage.getItem(DISMISSED_KEY)
        if (newVersion !== cachedVersion && newVersion !== dismissedVersion) {
          setVisible(true)
        }
      } catch {
        // silent
      }
    }

    checkUpdate()
    const timer = setInterval(checkUpdate, CHECK_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  async function handleRefresh() {
    try {
      await fetchVersion(import.meta.env.BASE_URL)
      localStorage.setItem(VERSION_KEY, latestVersion.current)
    } finally {
      window.location.reload()
    }
  }

  async function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, latestVersion.current)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="version-notify">
      <span className="version-notify-icon">🔄</span>
      <span className="version-notify-text">网站内容已更新，请刷新页面获取最新内容</span>
      <button className="version-notify-refresh" onClick={handleRefresh} type="button">
        刷新页面
      </button>
      <button
        className="version-notify-close"
        onClick={handleDismiss}
        type="button"
        aria-label="关闭"
      >
        ✕
      </button>
    </div>
  )
}

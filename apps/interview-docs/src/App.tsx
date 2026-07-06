import { Route, Routes } from 'react-router'
import DocPage from './components/DocPage'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import HomePage from './components/HomePage'
import UpdateNotification from './components/UpdateNotification'

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/*" element={<DocPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <UpdateNotification />
    </div>
  )
}

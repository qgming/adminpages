// 应用入口：路由 + 主题
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { HomePage } from '@/pages/home'
import { ProjectListPage } from '@/pages/admin'
import { ProjectDetailPage } from '@/pages/project-detail'
import { SettingsPage } from '@/pages/settings'
import { NotFoundPage } from '@/pages/not-found'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<ProjectListPage />} />
          <Route path="/admin/p/:projectId" element={<ProjectDetailPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

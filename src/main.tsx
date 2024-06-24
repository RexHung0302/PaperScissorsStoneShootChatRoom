import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { router } from './routers'
import { RouterProvider } from 'react-router-dom'
import { AuthContext, initialAuthInfo } from './store/authProvider'
import { GlobalContext, initialGlobalInfo } from './store/globalProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <GlobalContext.Provider value={initialGlobalInfo}>
      <AuthContext.Provider value={initialAuthInfo}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </GlobalContext.Provider>
  // </React.StrictMode>,
)

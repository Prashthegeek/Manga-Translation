import React from 'react'
import {BrowserRouter, Route,Routes} from 'react-router-dom';
import Previous from './components/Previous';
import FileUpload from './components/FileUpload';
import DownloadPage from './components/DownloadPage'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path = '/' element={<FileUpload/>}/>
        <Route path = '/download' element={<DownloadPage/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App 
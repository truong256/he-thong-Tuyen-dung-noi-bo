import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuestionBankPage from './pages/QuestionBankPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="*"
          element={<QuestionBankPage />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
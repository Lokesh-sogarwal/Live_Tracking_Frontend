import React from 'react';
import Layout from '../Layout/Layout';
import { Routes, Route } from "react-router-dom";
import { userRoutes } from "../../routes/mainRoutes";

const MainContainer = () => {
    console.log(userRoutes);
  return (
    <Layout>
      <Routes>
        {userRoutes.map((item) => (
          <Route key={item.id} path={item.path} element={item.element} />
        ))}
      </Routes>
    </Layout>
  );
};

export default MainContainer;

// vite.config.js
export default {
  server: {
    proxy: {
      "/solar-api": {
        target: "https://monitoringapi.solaredge.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/solar-api/, ""),
      },
    },
  },
};

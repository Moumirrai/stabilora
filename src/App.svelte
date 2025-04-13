<script lang="ts">
  import "./app.css";
  import Router from 'svelte-spa-router';
  import AppPage from './pages/AppPage.svelte';
  import LandingPage from './pages/LandingPage.svelte';
  
  const routes = {
    '/': LandingPage,
    '/app': AppPage,
  };
</script>

<!-- <Router {routes} /> -->

<main>
  <AppPage />
</main>

<style>
</style>

<script lang="ts">
  import './app.css';
  import Router from 'svelte-spa-router';
  import AppPage from './pages/AppPage.svelte';
  import LandingPage from './pages/LandingPage.svelte';
  import * as Tooltip from '$lib/components/ui/tooltip';

  const routes = { '/': LandingPage, '/app': AppPage };
</script>

<!-- <Router {routes} /> -->
<main>
  <Tooltip.Provider>
    <AppPage />
  </Tooltip.Provider>
</main>

<style></style>

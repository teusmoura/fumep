<script setup lang="ts">
import { getInstitution } from "~/lib/institutions";

const route = useRoute();
const institution = getInstitution(String(route.params.institution));
if (!institution || institution.slug === "fumep") {
  throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
}
</script>

<template>
  <InstitutionHome :institution="institution" />
</template>

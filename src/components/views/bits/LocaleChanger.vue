<template>
  <div class="text-xs-right">
    <v-menu offsetY>
      <template v-slot:activator="{ on }">
        <v-btn
          small
          v-on="on">
          {{ languages.find((language) => language.value === $i18n.locale).label }}
        </v-btn>
      </template>
      <v-list>
        <v-list-tile
          v-for="language in languages"
          :key="language.value"
          @click="$i18n.locale = language.value">
          <v-list-tile-title>{{ language.label }}</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
export default {
  data () {
    return {
      languages: [
        { value: 'en', label: '🇬🇧 English' },
        { value: 'fr', label: '🇫🇷 Français' },
        { value: 'nl', label: '🇳🇱 Nederlands' },
      ],
    };
  },
};
</script>

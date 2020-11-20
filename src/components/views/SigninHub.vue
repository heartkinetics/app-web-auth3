<template>
  <div>
    <h1>{{ $t('signinHub.signinHub') }}</h1>

    <v-form
      ref="form"
      v-model="validForm"
      @submit.prevent>

      <v-text-field
        id="usernameOrEmail"
        v-model="ctx.user.username"
        :rules="[rules.required]"
        :label="$t('signinHub.usernameOrEmail')"/>

      <v-btn
        id="submitButton"
        :disabled="!validForm"
        @click="submit"
      >{{ $t('signinHub.gotToMyHomepage') }}</v-btn>

    </v-form>

    <v-divider class="mt-3 mb-2"/>
    <router-link :to="{ name: 'RegisterUser' }"><h3>{{ $t('signinHub.newTo') }} {{ serviceInfo.name }} ? {{ $t('signinHub.createAccount') }}</h3></router-link>

    <Alerts
      :errorMsg="error"/>
  </div>
</template>

<script>
import Alerts from './bits/Alerts';
import Context from '../../context.js';
import controllerFactory from '../controller/controller.js';

export default {
  components: {
    Alerts,
  },
  data () {
    return {
      username: '',
      error: '',
      ctx: {},
      c: null,
      rules: {
        required: value => !!value || this.$i18n.t('signinHub.fieldRequired'),
      },
      validForm: false,
      serviceInfo: {name: ''},
    };
  },
  async created () {
    this.ctx = new Context(this.$route.query);
    await this.ctx.init();
    this.c = controllerFactory(this.ctx);
    this.serviceInfo = await this.ctx.pryvService.info();
  },
  methods: {
    submit () {
      if (this.$refs.form.validate()) {
        this.c.checkUsername()
          .then(this.toMyPryv)
          .catch(this.showError);
      }
    },
    toMyPryv () {
      location.href = this.ctx.pryvService.apiEndpointForSync(this.ctx.user.username);
    },
    showError (error) {
      this.error = error.msg;
    },
  },
};
</script>

<template>
  <div>
    <h1>{{ pageTitle }}</h1>

    <v-form
      v-if="showForm"
      ref="form"
      v-model="validForm"
      @submit.prevent>

      <v-text-field
        id="usernameOrEmail"
        v-model="ctx.user.username"
        :rules="[rules.required]"
        :label="$t('resetPassword.usernameOrEmail')"/>

      <Password
        v-if="resetToken!=null"
        v-model="password"
        :label="$t('resetPassword.password')"
        :confirmation="true"/>

      <v-btn
        id="submitButton"
        :disabled="!validForm||submitting"
        @click="submit"
      >{{ buttonText }}</v-btn>
    </v-form>
    <!--
    // If the reset password happend during an Auth Proceess (pollUrl exists)
    -->
    <div v-if="ctx.isAccessRequest()">
      <v-divider class="mt-3 mb-2"/>
      <router-link :to="{ name: 'Authorization' }"><h3>{{ $t('resetPassword.goToSignIn') }}</h3></router-link>
    </div>

    <Alerts
      :successMsg="success"
      :errorMsg="error"/>
  </div>
</template>

<script>
import Password from './bits/Password';
import Alerts from './bits/Alerts';
import Context from '../../context.js';
import controllerFactory from '../controller/controller.js';

export default {
  components: {
    Password,
    Alerts,
  },
  props: {
    resetToken: {type: String, default: null},
  },
  data () {
    return {
      password: '',
      error: '',
      success: '',
      showForm: true,
      submitting: false,
      ctx: {},
      c: null,
      rules: {
        required: value => !!value || this.$i18n.t('resetPassword.fieldRequired'),
      },
      validForm: false,
    };
  },
  computed: {
    pageTitle: function () {
      return this.resetToken ? this.$t('resetPassword.setNewPassword') : this.$t('resetPassword.resetPassword');
    },
    buttonText: function () {
      return this.resetToken ? this.$t('resetPassword.changePassword') : this.$t('resetPassword.requestPasswordReset');
    },
  },
  async created () {
    this.ctx = new Context(this.$route.query);
    await this.ctx.init();
    this.c = controllerFactory(this.ctx);
  },
  methods: {
    submit () {
      if (this.$refs.form.validate()) {
        this.submitting = true;
        // Ask for a reset token
        if (this.resetToken == null) {
          this.c.requestResetPassword()
            .then(() => {
              this.showForm = false;
              this.success = this.$t('resetPassword.passwordResetInstructionsSent');
            })
            .catch(this.showError)
            .finally(() => { this.submitting = false; });
        } else {
          // If we already got a reset token, we can change the password
          this.c.resetPassword(this.password, this.resetToken)
            .then(() => {
              this.showForm = false;
              this.success = this.$t('resetPassword.passwordSuccessfullyChanged');
            })
            .catch(this.showError)
            .finally(() => { this.submitting = false; });
        }
      }
    },
    showError (error) {
      this.error = error.msg;
    },
  },
};
</script>

<template>
  <div>
    <h1>{{ $t('authorization.signIn') }}</h1>

    <Permissions
      v-if="ctx.checkAppResult.checkedPermissions != null"
      :ctx="ctx"
      @accepted="accept"
      @refused="refuse"
    />

    <!--v-model below may be replaced by v-if-->
    <v-dialog
      v-model="mfaActivated"
      persistent
      width="600">
      <v-card>
        <v-card-title
          class="headline grey lighten-2"
        >{{ $t('authorization.mfaVerification') }}</v-card-title
        >
        <v-text-field
          id="mfaCode"
          v-model="mfaCode"
          :rules="[rules.required]"
          class="ma-3"
          label="MFA code"
        />
        <v-card-actions>
          <v-spacer />
          <v-btn
            @click="
              ctx.user.mfaToken = '';
              mfaCode = '';
            "
          >{{ $t('authorization.cancel') }}</v-btn
          >
          <v-btn @click="handleMFA()">{{ $t('authorization.ok') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-form
      ref="form"
      v-model="validForm"
      @submit.prevent>
      <v-text-field
        id="usernameOrEmail"
        v-model="ctx.user.username"
        :rules="[rules.required]"
        :label="$t('authorization.usernameOrEmail')"
      />

      <Password
        v-model="password"
        :label="$t('authorization.password')"
      />

      <v-btn
        id="submitButton"
        :disabled="!validForm || submitting"
        @click="submit"
      >{{ $t('authorization.signIn') }}</v-btn
      >

      <v-btn @click="refuse">{{ $t('authorization.cancel') }}</v-btn>

      <div v-if="serviceInfos.support">
        {{ $t('authorization.supportIntro') }}
        <a
          :href="serviceInfos.support"
          target="_blank"> {{ $t('authorization.helpdesk') }}</a>
        {{ $t('authorization.supportEnd') }}
      </div>
    </v-form>

    <v-divider class="mt-3 mb-2" />

    <router-link
      :to="{ name: 'RegisterUser' }"
    ><h3>{{ $t('authorization.createAccount') }}</h3></router-link
    >

    <router-link
      :to="{ name: 'ResetPassword' }"
    ><h3>{{ $t('authorization.forgotPassword') }}</h3></router-link
    >

    <router-link
      :to="{ name: 'ChangePassword' }"
    ><h3>{{ $t('authorization.changePassword') }}</h3></router-link
    >

    <Alerts :errorMsg="error" />
  </div>
</template>

<script>
import Password from './bits/Password.vue';
import Permissions from './bits/Permissions.vue';
import Alerts from './bits/Alerts.vue';
import Context from '../../context.js';
import controllerFactory from '../controller/controller.js';

export default {
  components: {
    Password,
    Permissions,
    Alerts,
  },
  data () {
    return {
      password: '',
      personalToken: '',
      mfaToken: '',
      mfaCode: '',
      error: '',
      checkedPermissions: null,
      checkAppResult: null,
      serviceInfos: {},
      submitting: false,
      c: null,
      ctx: {},
      rules: {
        required: (value) => !!value || this.$i18n.t('authorization.fieldRequired'),
        email: (value) => /.+@.+/.test(value) || this.$i18n.t('authorization.emailMustBeValid'),
      },
      validForm: false,
    };
  },
  computed: {
    mfaActivated: {
      get: function () {
        return this.ctx.user.mfaToken !== '';
      },
    },
  },
  async created () {
    this.ctx = new Context(this.$route.query);
    await this.ctx.init();
    this.c = controllerFactory(this.ctx);
    this.c
      .getServiceInfo()
      .then(this.showInfos)
      .catch(this.showError);
  },
  methods: {
    async submit () {
      if (this.$refs.form.validate()) {
        this.submitting = true;
        try {
          await this.c.login(this.password);
          if (!this.ctx.accessState) {
            throw new Error('Context access state not defined. Verify that you are performing an Auth request process and either "poll" is specified in query parameters.');
          }
          if (!this.mfaActivated) {
            await this.c.checkAccess(this.showPermissions);
          }
        } catch (err) {
          this.showError(err);
        } finally {
          this.submitting = false;
        }
      }
    },
    // Handle provided MFA code
    async handleMFA () {
      try {
        await this.c.mfaVerify(this.mfaCode);
        await this.c.checkAccess(this.showPermissions);
      } catch (err) {
        this.showError(err);
      } finally {
        this.ctx.user.mfaToken = '';
      }
    },
    // Print requested permissions to the user
    showPermissions () {
      this.checkAppResult = this.ctx.checkAppResult;
      this.checkedPermissions = this.ctx.checkedPermissions;
    },
    // The user accepts the requested permissions
    accept () {
      this.c.acceptAccess().catch(this.showError);
    },
    // The user refuses the requested permissions
    refuse () {
      this.c.refuseAccess().catch(this.showError);
    },
    showError (error) {
      this.error = error.msg || error.message;
    },
    showInfos (infos) {
      this.serviceInfos = infos;
    },
  },
};
</script>

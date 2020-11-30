<template>
  <div>
    <h1>{{ $t('registerUser.registerNewUser') }}</h1>

    <v-form
      v-if="newUser==null"
      id="registerForm"
      ref="form"
      v-model="validForm"
      @submit.prevent>

      <v-text-field
        id="email"
        v-model="email"
        :label="$t('registerUser.email')"
        :placeholder="$t('registerUser.optional')"
      />

      <v-text-field
        id="username"
        v-model="ctx.user.username"
        :rules="[rules.required]"
        :label="$t('registerUser.username')"
      />

      <Password
        v-model="password"
        :label="$t('registerUser.password')"
        :confirmation="true"/>

      <v-autocomplete
        id="hosting"
        v-model="hosting"
        :items="hostingsSelection"
        :rules="[rules.required]"
        :placeholder="$t('registerUser.chooseHosting')"
        :label="$t('registerUser.hosting')"
      />

      <v-text-field
        id="studyCode"
        v-model="studyCode"
        :rules="[rules.required]"
        :label="$t('registerUser.studyCode')"
      />

      <v-text-field
        id="subjectCode"
        v-model="subjectCode"
        :rules="[rules.required]"
        :label="$t('registerUser.subjectCode')"
      />

      <v-btn
        id="submitButton"
        :disabled="!validForm||submitting"
        @click="submit"
      >{{ $t('registerUser.create') }}</v-btn>

      <v-btn
        id="clearButton"
        @click="clear"
      >{{ $t('registerUser.clear') }}</v-btn>

      <div>
        {{ $t('registerUser.registeringAgreement') }}
        <a
          target="_blank"
          href="https://pryv.com/terms-of-use/">
        {{ $t('registerUser.termsOfUse') }}</a>.
      </div>
    </v-form>
    <div v-if="ctx.isAccessRequest()">
      <v-divider class="mt-3 mb-2"/>
      <router-link :to="{ name: 'Authorization' }"><h3>{{ $t('registerUser.goToSignIn') }}</h3></router-link>
    </div>

    <Alerts
      :successMsg="success"
      :errorMsg="error"/>
  </div>
</template>

<script>
import Password from './bits/Password.vue';
import Alerts from './bits/Alerts.vue';
import Context from '../../context.js';
import controllerFactory from '../controller/controller.js';

export default {
  components: {
    Password,
    Alerts,
  },
  data () {
    return {
      password: '',
      email: '',
      hosting: '',
      hostingsSelection: [],
      studyCode: '',
      subjectCode: '',
      newUser: null,
      submitting: false,
      ctx: {},
      c: null,
      error: '',
      success: '',
      rules: {
        required: value => !!value || this.$i18n.t('registerUser.fieldRequired'),
      },
      validForm: false,
    };
  },
  async created () {
    this.ctx = new Context(this.$route.query);
    await this.ctx.init();
    this.c = controllerFactory(this.ctx);
    // Fill selector with available hostings, preselect first one
    this.c.loadHostings()
      .then(this.initHostings)
      .catch(this.showError);
  },
  methods: {
    async submit () {
      if (this.$refs.form.validate()) {
        this.submitting = true;

        // Validate studyCode and subjectCode before proceeding
        const response = await fetch(
          `https://kino-research-uhcjixolra-ew.a.run.app/studies/${this.studyCode}/subjects/${this.subjectCode}/exists`
        );

        if (response.ok) {
          this.generateRandomEmailIfNeeded();
          // get least occupied core in the hosting
          let availableCore = '';
          this.hostingsSelection.forEach(selection => {
            if (selection.value === this.hosting) {
              availableCore = selection.availableCore;
            }
          });

          try {
            const newUser = await this.c.createUser(availableCore, this.password, this.email, this.hosting);
            this.newUser = newUser;
            this.success = `${this.$t('registerUser.userSuccessfullyCreated')} ${newUser.username}.`;

            // Login user to retrieve access token
            await this.c.login(this.password);

            const endpoint = (new URL(this.newUser.apiEndpoint)).origin;

            // Create external-references stream
            await this.createExternalReferencesStream(endpoint);

            // Create external-reference event
            await this.createExternalReferenceEvent(endpoint);

            if (!this.ctx.isAccessRequest()) {
              location.href = this.ctx.pryvService.apiEndpointForSync(newUser.username);
            }
          } catch (error) {
            this.showError(error);
          }
        } else {
          const json = await response.json();
          if (json && json.status === 404) {
            this.error = json.error.message;
          }
        }

        this.submitting = false;
      }
    },
    clear () {
      this.$refs.form.reset();
    },
    initHostings (hostings) {
      this.hostingsSelection = hostings;
      if (this.hostingsSelection.length > 0) {
        this.hosting = this.hostingsSelection[0].value;
      }
    },
    showError (error) {
      this.error = error.msg;
    },
    generateRandomEmailIfNeeded () {
      if (this.email == null || (typeof this.email === 'string' && this.email.length === 0)) {
        this.email = randomUsername(20) + '@pryv.io';
      }
    },
    async createExternalReferencesStream (endpoint) {
      await fetch(`${endpoint}/streams`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': this.ctx.user.personalToken,
        },
        body: JSON.stringify({
          'id': 'external-references',
          'name': 'External references',
          'parentId': null,
        }),
      });
    },
    async createExternalReferenceEvent (endpoint) {
      await fetch(`${endpoint}/events`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': this.ctx.user.personalToken,
        },
        body: JSON.stringify({
          'streamIds': ['external-references'],
          'type': 'external-reference/kino-research',
          'content': {
            'studyCode': this.studyCode,
            'subjectCode': this.subjectCode,
          },
        }),
      });
    },
  },
};

function randomUsername (length) {
  let result = '';
  let characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
</script>

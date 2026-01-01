import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { emailDomainValidator } from './functions/email-domain-validator/resource';
import { generateImage } from './functions/generate-image/resource';
import { enhancePrompt } from './functions/enhance-prompt/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
    auth,
    data,
    storage,
    emailDomainValidator,
    generateImage,
    enhancePrompt,
});
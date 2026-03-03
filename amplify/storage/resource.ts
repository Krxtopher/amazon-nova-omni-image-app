import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'imageGeneratorStorage',
    access: (allow) => ({
        'images/{entity_id}/*': [
            allow.entity('identity').to(['read', 'write', 'delete'])
        ],
        'public/*': [
            allow.authenticated.to(['read'])
        ]
    })
});
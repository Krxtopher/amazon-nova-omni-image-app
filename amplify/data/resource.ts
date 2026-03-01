import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
    ImageMetadata: a
        .model({
            id: a.id().required(),
            userId: a.string().required(),
            prompt: a.string().required(),
            enhancedPrompt: a.string(),
            aspectRatio: a.string(),
            width: a.integer(),
            height: a.integer(),
            s3Key: a.string().required(),
            s3Url: a.string(),
            createdAt: a.datetime().required(),
            updatedAt: a.datetime().required(),
        })
        .authorization((allow) => [allow.owner()]),

    PersonaData: a
        .model({
            id: a.id().required(),
            userId: a.string().required(),
            name: a.string().required(),
            description: a.string(),
            icon: a.string(),
            promptTemplate: a.string().required(),
            isDefault: a.boolean().default(false),
            createdAt: a.datetime().required(),
            updatedAt: a.datetime().required(),
        })
        .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: "userPool",
    },
});
export const authenticatorTheme = {
    name: 'image-generator-theme',
    tokens: {
        colors: {
            brand: {
                primary: {
                    10: 'hsl(var(--primary))',
                    80: 'hsl(var(--primary))',
                    90: 'hsl(var(--primary))',
                    100: 'hsl(var(--primary))',
                },
            },
            background: {
                primary: 'hsl(var(--background))',
                secondary: 'hsl(var(--muted))',
            },
            font: {
                primary: 'hsl(var(--foreground))',
                secondary: 'hsl(var(--muted-foreground))',
            },
            border: {
                primary: 'hsl(var(--border))',
            },
        },
        components: {
            authenticator: {
                router: {
                    boxShadow: 'none',
                    borderWidth: '1px',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                },
            },
            button: {
                primary: {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    _hover: {
                        backgroundColor: 'hsl(var(--primary)/0.9)',
                    },
                },
            },
            fieldcontrol: {
                borderColor: 'hsl(var(--border))',
                _focus: {
                    borderColor: 'hsl(var(--primary))',
                },
            },
        },
    },
};

export const authenticatorFormFields = {
    signIn: {
        username: {
            placeholder: 'Enter your email address',
            label: 'Email Address',
        },
    },
};

export const authenticatorComponents = {
    Header() {
        return (
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                    Image Generator
                </h1>
                <p className="text-muted-foreground">
                    Sign in with your credentials
                </p>
            </div>
        );
    },

    Footer() {
        return (
            <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                    Contact your administrator for account access
                </p>
            </div>
        );
    },
};
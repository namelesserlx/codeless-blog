import { SwaggerRouter } from 'koa-swagger-decorator';
import path from 'path';

const swaggerRouter = new SwaggerRouter();

// Swagger endpoint
swaggerRouter.swagger({
    title: "CodeLess'sBlog API",
    description: 'API Documentation',
    version: '1.0.0',
    prefix: '/api',
    swaggerHtmlEndpoint: '/swagger',
    swaggerJsonEndpoint: '/swagger.json',
    swaggerOptions: {
        securityDefinitions: {
            Bearer: {
                type: 'apiKey',
                in: 'header',
                name: 'Authorization',
            },
        },
    },
});

// Map all routes
swaggerRouter.mapDir(path.resolve(__dirname, '../controllers'), {
    doValidation: false,
    recursive: true,
    ignoreFiles: [],
    defaultProperties: {
        security: [{ Bearer: [] }],
    },
});

export default swaggerRouter;

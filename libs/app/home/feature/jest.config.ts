// /* eslint-disable */
// export default {
//   displayName: 'app-home-feature',
//   preset: '../../../../jest.preset.js',
//   transform: {
//     '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
//   },
//   moduleFileExtensions: ['ts', 'js', 'html'],
//   coverageDirectory: '../../../../coverage/libs/app/home/feature',
// };

/* eslint-disable */
export default {
  displayName: 'app-home-feature',
  preset: '../../../../jest.preset.js',
  setupFilesAfterEnv: ['../../../../apps/app/src/test-setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.(html|svg)$',
    },
  },
  coverageDirectory: '../../../coverage/libs/app/home/feature',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': 'jest-preset-angular',
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};

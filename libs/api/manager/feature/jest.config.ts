/* eslint-disable */
export default {
  displayName: 'api-manager-feature',
  preset: '../../../../jest.preset.js',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/api/manager/feature',
  coverageReporters: ['json', 'html'], // Include 'json' for JSON coverage report
};

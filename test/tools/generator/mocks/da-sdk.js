const mockContext = {
  repo: 'adobecom',
  owner: 'test',
  ref: 'main',
};

const mockToken = 'mock-token';

const mockSDK = {
  context: mockContext,
  token: mockToken,
};

export default Promise.resolve(mockSDK);

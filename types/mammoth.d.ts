declare module "mammoth" {
  interface MammothResult {
    value: string;
  }

  function extractRawText(options: { buffer: Buffer }): Promise<MammothResult>;

  const mammoth: {
    extractRawText: typeof extractRawText;
  };

  export { extractRawText };
  export default mammoth;
}

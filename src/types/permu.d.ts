declare module 'permu' {
  function permu<T>(length: number, attributes: T[]): T[][];

  export default permu;
}

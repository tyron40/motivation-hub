import { publicProcedure } from '../../../init';

export const hiProcedure = publicProcedure.query(() => {
  return { message: 'Hello from tRPC!' };
});

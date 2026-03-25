import { z } from 'zod';
import { protectedProcedure } from '../../init';

export const chatProcedures = {
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }),

  createConversation: protectedProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('conversations')
        .insert({
          user_id: ctx.user.id,
          title: input.title || 'New chat',
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', input.conversationId)
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('messages')
        .insert({
          conversation_id: input.conversationId,
          user_id: ctx.user.id,
          role: input.role,
          content: input.content,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),
};

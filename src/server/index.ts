import { publicProcedure, router } from "./trpc";
import { z } from "zod";

type User = { username: string; id: string };
const users: Array<User> = [{ username: "lennart", id: "1" }];

export const appRouter = router({
  userList: publicProcedure.query(async () => {
    return users;
  }),
  userById: publicProcedure.input(z.string()).query(async (opts) => {
    const { input } = opts;

    // Retrieve the user with the given ID
    const user = users.find((u) => u.id === input);
    return user;
  }),
  userCreate: publicProcedure.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    const randomId = Math.random().toString(36).substring(7);
    const newUser = { username: input, id: randomId };
    users.push(newUser);
    return newUser;
  }),
});

export type AppRouter = typeof appRouter;

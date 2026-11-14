import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config/config";
import { HttpError } from "../../utils/errors";
import { User } from "./model";
import type { IUser, PublicUser } from "./interface";

export interface TokenPayload {
  sub: string;
}

export class AuthService {
  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{ token: string; user: PublicUser }> {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new HttpError(409, "An account with that email already exists.", "taken");
    }

    const passwordHash = await bcrypt.hash(input.password, config.auth.bcryptRounds);
    const user = await User.create({
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
    });

    return { token: this.sign(user), user: this.publicOf(user) };
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: PublicUser }> {
    const user = await User.findOne({ email: input.email.toLowerCase() });

    // Deliberately the same refusal whether the address is unknown or the
    // password is wrong. Telling them apart turns the login form into a way
    // of asking which of these people has an account here.
    const refuse = () => new HttpError(401, "Those details do not match.", "bad-credentials");
    if (!user) {
      // Still spend the time a real comparison would, so the answer does not
      // arrive measurably faster for an address nobody has registered.
      await bcrypt.compare(input.password, "$2a$12$" + "x".repeat(53));
      throw refuse();
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw refuse();

    return { token: this.sign(user), user: this.publicOf(user) };
  }

  async byId(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  verify(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
    } catch {
      throw new HttpError(401, "That session is no longer valid.", "bad-token");
    }
  }

  sign(user: IUser): string {
    return jwt.sign({ sub: String(user._id) }, config.auth.jwtSecret, {
      expiresIn: config.auth.accessExpiresIn,
    } as jwt.SignOptions);
  }

  publicOf(user: IUser): PublicUser {
    return {
      id: String(user._id),
      email: user.email,
      name: user.name ?? null,
      subjectId: user.subjectId,
    };
  }
}

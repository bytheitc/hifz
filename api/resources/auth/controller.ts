import type { Request, Response } from "express";
import { HttpError } from "../../utils/errors";
import { AuthService } from "./service";

export class AuthController {
  private service = new AuthService();

  async register(req: Request, res: Response): Promise<void> {
    const result = await this.service.register(req.body);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const result = await this.service.login(req.body);
    res.status(200).json(result);
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) throw new HttpError(401, "Not signed in.");
    res.status(200).json({ user: this.service.publicOf(user) });
  }
}

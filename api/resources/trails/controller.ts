import type { Request, Response } from "express";
import { TrailService } from "./service";
import type { IUser } from "../auth/interface";

export class TrailController {
  private service = new TrailService();

  async mine(req: Request, res: Response): Promise<void> {
    const user = (req as any).user as IUser;
    res.status(200).json(await this.service.mine(user._id, user.subjectId));
  }

  async addPortions(req: Request, res: Response): Promise<void> {
    const user = (req as any).user as IUser;
    const result = await this.service.addPortions(
      user._id,
      user.subjectId,
      req.body.portions
    );
    res.status(200).json(result);
  }

  async addEvents(req: Request, res: Response): Promise<void> {
    const user = (req as any).user as IUser;
    res.status(200).json(await this.service.addEvents(user._id, req.body.events));
  }
}

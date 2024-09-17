import jwt from "jsonwebtoken";
import { User } from "../types/authentication";
import fs from "fs/promises";
import path from "path";
import { AuthLevels } from "./auth.config";

interface StoredUser extends User {
	password: string;
}

export class AuthService {
	private static instance: AuthService;
	private secretKey: string;
	private accessFilePath: string;

	private constructor() {
		this.secretKey = process.env.JWT_SECRET_KEY || "your-secret-key";
		this.accessFilePath = path.join(__dirname, "access.json");
	}

	public static getInstance(): AuthService {
		if (!AuthService.instance) {
			AuthService.instance = new AuthService();
		}
		return AuthService.instance;
	}

	public createJwtToken(user: User): string {
		const payload = {
			username: user.username,
			access: user.access,
		};
		return jwt.sign(payload, this.secretKey, { expiresIn: "1h" });
	}

	public verifyJwtToken(token: string): User | null {
		if(!token) return null;
		try {
			const decoded = jwt.verify(token, this.secretKey) as User;
			return decoded;
		} catch (error) {
			console.error("JWT verification failed:", error);
			return null;
		}
	}

	public getUserFromToken(token: string): User | null {
		const decoded = this.verifyJwtToken(token);
		if (decoded && decoded.username && decoded.access) {
			return {
				username: decoded.username,
				access: decoded.access,
			};
		}
		return null;
	}

	public async login(
		username: string,
		password: string
	): Promise<string | null> {
		try {
			const users = await this.readAccessFile();
			const user = users.find(
				(u) => u.username === username && u.password === password
			);
			if (user) {
				const { password, ...userWithoutPassword } = user;
				return this.createJwtToken(userWithoutPassword);
			}
			return null;
		} catch (error) {
			console.error("Login failed:", error);
			return null;
		}
	}

	public async verifyLogin(token: string): Promise<User | null> {
		const user = this.getUserFromToken(token);
		if (!user) {
			return null;
		}

		try {
			const users = await this.readAccessFile();
			const storedUser = users.find((u) => u.username === user.username);

			if (storedUser) {
				// Check if the access rights in the token match the stored access rights


				if (
					JSON.stringify(user.access) ===
					JSON.stringify(storedUser.access)
				) {
					return user;
				}
			}

			return null;
		} catch (error) {
			console.error("Verify login failed:", error);
			return null;
		}
	}


	public async hasAccess(
		user : User,
		access : AuthLevels
	): Promise<boolean> {

		try {
			const users = await this.readAccessFile();
			const storedUser = users.find((u) => u.username === user.username);

			console.log(storedUser);
			

			if (storedUser) {

				console.log(storedUser.access.includes(access));
				
				// Check if the access rights in the token match the stored access rights

				if(storedUser.access.includes(access)) return true;
			}

			return null;
		} catch (error) {
			console.log("user access check failed", error);
			return null;
		}
	}

	private async readAccessFile(): Promise<StoredUser[]> {
		try {
			const data = await fs.readFile(this.accessFilePath, "utf8");
			return JSON.parse(data);
		} catch (error) {
			console.error("Error reading access file:", error);
			return [];
		}
	}
}

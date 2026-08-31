import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<number>('MAIL_PORT') === 465,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const from = this.configService.get<string>('MAIL_FROM');

    const fromName =
      this.configService.get<string>('MAIL_FROM_NAME') ?? 'Finance App';

    await this.transporter.sendMail({
      from: `"${fromName}" <${from}>`,
      to: email,
      subject: 'Verify your Finance account',
      text: `Your verification code is: ${code}`,
      html: `
        <h2>Verify your email</h2>

        <p>
          Thank you for creating your Finance account.
        </p>

        <p>
          Your verification code is:
        </p>

        <h1>${code}</h1>

        <p>
          This code expires in 10 minutes.
        </p>
      `,
    });
  }
}

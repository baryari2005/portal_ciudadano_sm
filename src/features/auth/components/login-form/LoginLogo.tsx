import Image from "next/image";

import { AUTH_IMAGES } from "../../constants/auth-theme";

export function LoginLogo() {
  return (
    <div className="flex justify-start">
      <Image
        src={AUTH_IMAGES.logo}
        alt="Más San Miguel"
        width={286}
        height={182}
        priority
        className="h-auto w-44 object-contain sm:w-52"
      />
    </div>
  );
}

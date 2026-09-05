import Image from "next/image";

import { AUTH_IMAGES } from "../../constants/auth-theme";

export function LoginLogo() {
  return (
    <div className="hidden justify-start lg:flex">
      <Image
        src={AUTH_IMAGES.logo}
        alt="Más San Miguel"
        width={286}
        height={182}
        priority
        className="h-auto w-36 object-contain sm:w-52"
      />
    </div>
  );
}

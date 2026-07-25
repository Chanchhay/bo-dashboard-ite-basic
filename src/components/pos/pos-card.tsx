import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,

} from "@/components/ui/card";

export interface PosCardType {
  name: string;
  price: number;
  image: string;
}
const PosCard = ({ name, price, image }: PosCardType) => {
  return (
    <Card className="w-40 pt-0">
      <CardContent className="px-0 border border-white rounded-2xl ">
        <img
          src={image}
          alt="Banner"
          className="aspect-video h-40 rounded-2xl object-cover"
        />
      </CardContent>
      <CardHeader>
        <CardTitle className="text-gray-500 font-semibold line-clamp-1">{name}</CardTitle>
        <CardTitle className="text-accent font-bold">${price}</CardTitle>
      </CardHeader>
    </Card>
  );
};

export default PosCard;
